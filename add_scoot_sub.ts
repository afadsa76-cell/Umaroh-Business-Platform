import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const scootFlights = [
  {
    id: '487',
    name: 'SCOOT SUB-SIN',
    hargaJual: 17927500,
    hargaBeli: 17750000,
    margin: 177500,
    persen: 1,
    programDays: 16,
    tanggalKeberangkatan: '2026-11-14',
    tanggalKepulangan: '2026-11-29',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 25,
    availableSeats: 25,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 17750000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '488',
    name: 'SCOOT SUB-SIN',
    hargaJual: 16362000,
    hargaBeli: 16200000,
    margin: 162000,
    persen: 1,
    programDays: 12,
    tanggalKeberangkatan: '2026-11-16',
    tanggalKepulangan: '2026-11-27',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 16200000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '489',
    name: 'SCOOT SUB-SIN',
    hargaJual: 18988000,
    hargaBeli: 18800000,
    margin: 188000,
    persen: 1,
    programDays: 16,
    tanggalKeberangkatan: '2026-11-28',
    tanggalKepulangan: '2026-12-13',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 18800000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '490',
    name: 'SCOOT SUB-SIN',
    hargaJual: 18988000,
    hargaBeli: 18800000,
    margin: 188000,
    persen: 1,
    programDays: 16,
    tanggalKeberangkatan: '2026-12-05',
    tanggalKepulangan: '2026-12-20',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 18800000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '491',
    name: 'SCOOT SUB-SIN',
    hargaJual: 19139500,
    hargaBeli: 18950000,
    margin: 189500,
    persen: 1,
    programDays: 16,
    tanggalKeberangkatan: '2026-12-12',
    tanggalKepulangan: '2026-12-27',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 18950000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '492',
    name: 'SCOOT SUB-SIN',
    hargaJual: 19139500,
    hargaBeli: 18950000,
    margin: 189500,
    persen: 1,
    programDays: 16,
    tanggalKeberangkatan: '2026-12-14',
    tanggalKepulangan: '2026-12-29',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 18950000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '493',
    name: 'SCOOT SUB-SIN',
    hargaJual: 19139500,
    hargaBeli: 18950000,
    margin: 189500,
    persen: 1,
    programDays: 9,
    tanggalKeberangkatan: '2026-12-19',
    tanggalKepulangan: '2026-12-27',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 18950000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '494',
    name: 'SCOOT SUB-SIN',
    hargaJual: 16766000,
    hargaBeli: 16600000,
    margin: 166000,
    persen: 1,
    programDays: 12,
    tanggalKeberangkatan: '2026-12-21',
    tanggalKepulangan: '2027-01-01',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 35,
    availableSeats: 35,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 16600000,
    updatedAt: new Date().toISOString()
  },
  {
    id: '495',
    name: 'SCOOT SUB-SIN',
    hargaJual: 15958000,
    hargaBeli: 15800000,
    margin: 158000,
    persen: 1,
    programDays: 9,
    tanggalKeberangkatan: '2026-12-22',
    tanggalKepulangan: '2026-12-30',
    originCityName: 'SURABAYA (SUB)',
    destinationCityName: 'SINGAPORE (SIN)',
    namaVendor: 'PT. Darmawisata Indonesia',
    totalSeats: 40,
    availableSeats: 40,
    ruteLabel: 'SUB-SIN',
    hargaSetoran: 15800000,
    updatedAt: new Date().toISOString()
  }
];

async function addData() {
  for (const flight of scootFlights) {
    try {
      const docRef = doc(db, 'maskapai', flight.id);
      await setDoc(docRef, flight);
      console.log(`Successfully added/updated: ${flight.name} (${flight.tanggalKeberangkatan})`);
    } catch (e) {
      console.error(`Error adding/updating flight ${flight.id}:`, e);
    }
  }
}

addData().then(() => {
  console.log('Seeding complete.');
  process.exit(0);
});
