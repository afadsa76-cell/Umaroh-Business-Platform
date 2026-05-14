
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('Config file not found');
      return;
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const dahliaData = [
      {
        name: 'OMAN AIR CGK-MCT-JED (10D)',
        hargaJual: 13800000,
        hargaBeli: 13700000,
        hargaSetoran: 13700000,
        margin: 100000,
        persen: 0.7,
        programDays: 10,
        tanggalKeberangkatan: '2026-09-26',
        tanggalKepulangan: '2026-10-05',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'MC/CHOxxx/JEDJED/10D'
      },
      {
        name: 'OMAN AIR CGK-MCT-JED-MED (09D)',
        hargaJual: 13500000,
        hargaBeli: 13400000,
        hargaSetoran: 13400000,
        margin: 100000,
        persen: 0.7,
        programDays: 9,
        tanggalKeberangkatan: '2026-10-09',
        tanggalKepulangan: '2026-10-17',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'MEDINAH (MED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'MC/UBKxxx/JED MED/09D'
      },
      {
        name: 'OMAN AIR CGK-MCT-JED (09D)',
        hargaJual: 13700000,
        hargaBeli: 13600000,
        hargaSetoran: 13600000,
        margin: 100000,
        persen: 0.7,
        programDays: 9,
        tanggalKeberangkatan: '2026-11-10',
        tanggalKepulangan: '2026-11-18',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 36,
        availableSeats: 36,
        ruteLabel: 'MC/HYxxxx/JEDJED/9D'
      },
      {
        name: 'OMAN AIR CGK-MCT-JED-MED SLOWUMRA (12D)',
        hargaJual: 13500000,
        hargaBeli: 13400000,
        hargaSetoran: 13400000,
        margin: 100000,
        persen: 0.7,
        programDays: 12,
        tanggalKeberangkatan: '2026-11-21',
        tanggalKepulangan: '2026-12-02',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'MEDINAH (MED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 36,
        availableSeats: 36,
        ruteLabel: 'MC/DExxx/JEDMED/SLOWUMRA 12D'
      }
    ];

    const colRef = collection(db, 'maskapai');
    for (const item of dahliaData) {
      const docRef = await addDoc(colRef, item);
      console.log(`Added: ${item.name} (${docRef.id})`);
    }
    console.log('Done');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
