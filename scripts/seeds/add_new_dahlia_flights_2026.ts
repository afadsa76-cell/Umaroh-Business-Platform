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

    const dahliaNewFlights = [
      // OMAN AIR - IBU DAHLIA - SEP/OCT/NOV/DEC 2026
      {
        name: 'OMAN AIR CGK-MCT-JED (09D) (PNR: HNI)',
        hargaJual: 15000000,
        hargaBeli: 14800000,
        margin: 200000,
        persen: 1.35,
        programDays: 9,
        tanggalKeberangkatan: '2026-09-02',
        tanggalKepulangan: '2026-09-10',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'MC/HNI/JEDJED/9D',
        hargaSetoran: 14800000
      },
      {
        name: 'OMAN AIR CGK-MCT-JED-MED (09D) (PNR: KDJ)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 9,
        tanggalKeberangkatan: '2026-09-16',
        tanggalKepulangan: '2026-09-24',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'MEDINAH (MED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'MC/KDJ/JEDMED/9D',
        hargaSetoran: 14900000
      },
      {
        name: 'OMAN AIR CGK-MCT-JED-MED (12D) (PNR: WEV)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 12,
        tanggalKeberangkatan: '2026-10-07',
        tanggalKepulangan: '2026-10-18',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'MEDINAH (MED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'MC/WEV/JEDMED/12D',
        hargaSetoran: 14900000
      },
      {
        name: 'OMAN AIR CGK-MCT-MED-JED (12D) (PNR: AR)',
        hargaJual: 15400000,
        hargaBeli: 15200000,
        margin: 200000,
        persen: 1.32,
        programDays: 12,
        tanggalKeberangkatan: '2026-11-16',
        tanggalKepulangan: '2026-11-27',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'AR/MEDJED/12D',
        hargaSetoran: 15200000
      },
      {
        name: 'OMAN AIR CGK-MCT-JED-MED (12D) (PNR: AR)',
        hargaJual: 14700000,
        hargaBeli: 14500000,
        margin: 200000,
        persen: 1.38,
        programDays: 12,
        tanggalKeberangkatan: '2026-11-28',
        tanggalKepulangan: '2026-12-09',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'MEDINAH (MED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 40,
        availableSeats: 40,
        ruteLabel: 'AR/JEDJED/12D',
        hargaSetoran: 14500000
      },

      // QATAR AIRWAYS - IBU DAHLIA - SEP/OCT/NOV 2026
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (12D) (PNR: AR)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 12,
        tanggalKeberangkatan: '2026-09-10',
        tanggalKepulangan: '2026-09-21',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/12D AR 2XJUMAT',
        hargaSetoran: 14900000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-MED-JED (12D) (PNR: HJ)',
        hargaJual: 15200000,
        hargaBeli: 15000000,
        margin: 200000,
        persen: 1.33,
        programDays: 12,
        tanggalKeberangkatan: '2026-09-16',
        tanggalKepulangan: '2026-09-27',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'MEDJED/12D HJ',
        hargaSetoran: 15000000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 9,
        tanggalKeberangkatan: '2026-09-23',
        tanggalKepulangan: '2026-10-01',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D',
        hargaSetoran: 14900000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: AR)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 9,
        tanggalKeberangkatan: '2026-10-05',
        tanggalKepulangan: '2026-10-13',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D AR',
        hargaSetoran: 14900000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: AR)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 9,
        tanggalKeberangkatan: '2026-10-10',
        tanggalKepulangan: '2026-10-18',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D AR',
        hargaSetoran: 14900000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 9,
        tanggalKeberangkatan: '2026-10-14',
        tanggalKepulangan: '2026-10-22',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D',
        hargaSetoran: 14900000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: AR)',
        hargaJual: 15100000,
        hargaBeli: 14900000,
        margin: 200000,
        persen: 1.34,
        programDays: 9,
        tanggalKeberangkatan: '2026-10-31',
        tanggalKepulangan: '2026-11-08',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D AR',
        hargaSetoran: 14900000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (12D) (PNR: HJ)',
        hargaJual: 14800000,
        hargaBeli: 14600000,
        margin: 200000,
        persen: 1.37,
        programDays: 12,
        tanggalKeberangkatan: '2026-11-04',
        tanggalKepulangan: '2026-11-15',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 32,
        availableSeats: 32,
        ruteLabel: 'JEDJED/12D 2XJUMAT HJ',
        hargaSetoran: 14600000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: HJ)',
        hargaJual: 14700000,
        hargaBeli: 14500000,
        margin: 200000,
        persen: 1.38,
        programDays: 9,
        tanggalKeberangkatan: '2026-11-04',
        tanggalKepulangan: '2026-11-12',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D HJ',
        hargaSetoran: 14500000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: HJ)',
        hargaJual: 14700000,
        hargaBeli: 14500000,
        margin: 200000,
        persen: 1.38,
        programDays: 9,
        tanggalKeberangkatan: '2026-11-12',
        tanggalKepulangan: '2026-11-20',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D HJ',
        hargaSetoran: 14500000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: HJ)',
        hargaJual: 14700000,
        hargaBeli: 14500000,
        margin: 200000,
        persen: 1.38,
        programDays: 9,
        tanggalKeberangkatan: '2026-11-16',
        tanggalKepulangan: '2026-11-24',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D HJ',
        hargaSetoran: 14500000
      },
      {
        name: 'QATAR AIRWAYS CGK-DOH-JED (09D) (PNR: HJ)',
        hargaJual: 14700000,
        hargaBeli: 14500000,
        margin: 200000,
        persen: 1.38,
        programDays: 9,
        tanggalKeberangkatan: '2026-11-17',
        tanggalKepulangan: '2026-11-25',
        originCityName: 'JAKARTA (CGK)',
        destinationCityName: 'JEDDAH (JED)',
        namaVendor: 'IBU DAHLIA',
        totalSeats: 45,
        availableSeats: 45,
        ruteLabel: 'JEDJED/9D HJ',
        hargaSetoran: 14500000
      }
    ];

    const colRef = collection(db, 'maskapai');
    for (const item of dahliaNewFlights) {
      const docRef = await addDoc(colRef, item);
      console.log(`Added: ${item.name} (${docRef.id})`);
    }
    console.log('Seeding successful!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

run();
