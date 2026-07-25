import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const flights = [
  // QATAR AIRWAYS - JULY
  {
    name: "Qatar Airways ABM/865XXX (HK45)",
    hargaBeli: 14400000,
    hargaJual: 15400000,
    margin: 1000000,
    persen: 0,
    programDays: 9,
    tanggalKeberangkatan: "2026-07-21",
    tanggalKepulangan: "2026-07-29",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  {
    name: "Qatar Airways ABM/8JGXXX (HK40)",
    hargaBeli: 14600000,
    hargaJual: 15600000,
    margin: 1000000,
    persen: 0,
    programDays: 10,
    tanggalKeberangkatan: "2026-07-22",
    tanggalKepulangan: "2026-07-31",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 40,
    availableSeats: 40
  },
  {
    name: "Qatar Airways ABM-DL (26JUL)",
    hargaBeli: 14300000,
    hargaJual: 15300000,
    margin: 1000000,
    persen: 0,
    programDays: 9,
    tanggalKeberangkatan: "2026-07-26",
    tanggalKepulangan: "2026-08-02",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  {
    name: "Qatar Airways ABM-DL (29JUL)",
    hargaBeli: 14300000,
    hargaJual: 15300000,
    margin: 1000000,
    persen: 0,
    programDays: 9,
    tanggalKeberangkatan: "2026-07-29",
    tanggalKepulangan: "2026-08-05",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  // QATAR AIRWAYS - AUGUST
  {
    name: "Qatar Airways ABM/83KXXX (HK45)",
    hargaBeli: 14850000,
    hargaJual: 15850000,
    margin: 1000000,
    persen: 0,
    programDays: 9,
    tanggalKeberangkatan: "2026-08-03",
    tanggalKepulangan: "2026-08-11",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  {
    name: "Qatar Airways ABM/7LCXXX (HK45)",
    hargaBeli: 14950000,
    hargaJual: 15950000,
    margin: 1000000,
    persen: 0,
    programDays: 9,
    tanggalKeberangkatan: "2026-08-06",
    tanggalKepulangan: "2026-08-14",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  {
    name: "Qatar Airways ABM/73AXXX (HK45)",
    hargaBeli: 14800000,
    hargaJual: 15800000,
    margin: 1000000,
    persen: 0,
    programDays: 12,
    tanggalKeberangkatan: "2026-08-12",
    tanggalKepulangan: "2026-08-23",
    originCityName: "Jakarta",
    destinationCityName: "Madinah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  // OMAN AIR - SEPTEMBER
  {
    name: "Oman Air ABM-KNM (04SEP)",
    hargaBeli: 13500000,
    hargaJual: 14500000,
    margin: 1000000,
    persen: 0,
    programDays: 10,
    tanggalKeberangkatan: "2026-09-04",
    tanggalKepulangan: "2026-09-14",
    originCityName: "Jakarta",
    destinationCityName: "Jeddah", // TIFTIF usually implies transit/round
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  },
  {
    name: "Oman Air ABM-KNM (10SEP)",
    hargaBeli: 13500000,
    hargaJual: 14500000,
    margin: 1000000,
    persen: 0,
    programDays: 12,
    tanggalKeberangkatan: "2026-09-10",
    tanggalKepulangan: "2026-09-22",
    originCityName: "Jakarta",
    destinationCityName: "Madinah",
    namaVendor: "AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45
  }
];

async function addData() {
  for (const flight of flights) {
    try {
      await addDoc(collection(db, 'maskapai'), flight);
      console.log(`Added: ${flight.name}`);
    } catch (e) {
      console.error(`Error adding ${flight.name}:`, e);
    }
  }
}

addData().then(() => process.exit(0));
