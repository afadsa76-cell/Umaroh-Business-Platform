import { AdminDatabaseResolver } from '../../src/core/firestore/AdminDatabaseResolver';
import firebaseConfig from '../../firebase-applet-config.json';

export const azzaFeb2027Flights = [
  {
    id: "ptazza-wy-01feb27-11d-45pax-qenxxx",
    name: "OMAN AIR CGK-JED/MED (11D) (45 PAX) (PNR: QENXXX CWDXXX)",
    hargaJual: 14800000,
    hargaBeli: 14500000,
    hargaSetoran: 14500000,
    margin: 300000,
    persen: 2.07,
    programDays: 11,
    tanggalKeberangkatan: "2027-02-01",
    tanggalKepulangan: "2027-02-11",
    originCityName: "JAKARTA (CGK)",
    destinationCityName: "JEDDAH (JED) / MEDINAH (MED)",
    namaVendor: "PT AZZA BAROKAH MADINAH",
    totalSeats: 45,
    availableSeats: 45,
    ruteLabel: "CGK - MCT - JED / MED - MCT - CGK",
    tipePenerbangan: "TRANSIT",
    flightItinerary: "*PT AZZA BAROKAH MADINAH*\n*READY PNR 2026/2027 BY OMAN AIR✈️*\n*ABM/QENXXX CWDXXX QENXXX/11D/14.500.000*\n1 WY 850G 01FEB M CGKMCT*HK45 1355  1830  /E\n2 WY 673G 01FEB M MCTJED*HK45 2130  0005   02FEB T /E\n3 WY 680G 10FEB W MEDMCT*HK45 1740  2130  /E\n4 WY 849G 11FEB Q MCTCGK*HK45 0145  1240  /E",
    updatedAt: new Date().toISOString()
  },
  {
    id: "ptazza-wy-02feb27-9d-39pax-apaxxx",
    name: "OMAN AIR CGK-JED/MED (09D) (39 PAX) (PNR: APAXXX CWBXXX WBKXXX)",
    hargaJual: 15100000,
    hargaBeli: 14800000,
    hargaSetoran: 14800000,
    margin: 300000,
    persen: 2.03,
    programDays: 9,
    tanggalKeberangkatan: "2027-02-02",
    tanggalKepulangan: "2027-02-10",
    originCityName: "JAKARTA (CGK)",
    destinationCityName: "JEDDAH (JED) / MEDINAH (MED)",
    namaVendor: "PT AZZA BAROKAH MADINAH",
    totalSeats: 39,
    availableSeats: 39,
    ruteLabel: "CGK - MCT - JED / MED - MCT - CGK",
    tipePenerbangan: "TRANSIT",
    flightItinerary: "*PT AZZA BAROKAH MADINAH*\n*READY PNR 2026/2027 BY OMAN AIR✈️*\n*ABM/APAXXX CWBXXX WBKXXX/9D/14.800.000*\n1 WY 850G 02FEB T CGKMCT*HK39 1355  1830  /E\n2 WY 671G 03FEB W MCTJED*HK39 0135  0410  /E\n3 WY 680G 09FEB T MEDMCT*HK39 1740  2130  /E\n4 WY 849G 10FEB W MCTCGK*HK39 0145  1240  /E",
    updatedAt: new Date().toISOString()
  },
  {
    id: "ptazza-wy-13feb27-13d-39pax-aocxxx",
    name: "OMAN AIR CGK-JED/MED (13D) (39 PAX) (PNR: AOCXXX WBDXXX WBKXXX)",
    hargaJual: 15100000,
    hargaBeli: 14800000,
    hargaSetoran: 14800000,
    margin: 300000,
    persen: 2.03,
    programDays: 13,
    tanggalKeberangkatan: "2027-02-13",
    tanggalKepulangan: "2027-02-25",
    originCityName: "JAKARTA (CGK)",
    destinationCityName: "JEDDAH (JED) / MEDINAH (MED)",
    namaVendor: "PT AZZA BAROKAH MADINAH",
    totalSeats: 39,
    availableSeats: 39,
    ruteLabel: "CGK - MCT - JED / MED - MCT - CGK",
    tipePenerbangan: "TRANSIT",
    flightItinerary: "*PT AZZA BAROKAH MADINAH*\n*READY PNR 2026/2027 BY OMAN AIR✈️*\n*ABM/AOCXXX WBDXXX WBKXXX/13D/14.800.000*\n1 WY 850G 13FEB J CGKMCT*HK39 1355  1830  /E\n2 WY 671G 14FEB S MCTJED*HK39 0135  0410  /E\n3 WY 680G 24FEB W MEDMCT*HK39 1740  2130  /E\n4 WY 849G 25FEB Q MCTCGK*HK39 0145  1240  /E",
    updatedAt: new Date().toISOString()
  },
  {
    id: "ptazza-wy-20feb27-12d-30pax-mhhxxx",
    name: "OMAN AIR CGK-JED/MED (12D) (30 PAX) (PNR: MHHXXX MHBXXX)",
    hargaJual: 14800000,
    hargaBeli: 14500000,
    hargaSetoran: 14500000,
    margin: 300000,
    persen: 2.07,
    programDays: 12,
    tanggalKeberangkatan: "2027-02-20",
    tanggalKepulangan: "2027-03-03",
    originCityName: "JAKARTA (CGK)",
    destinationCityName: "JEDDAH (JED) / MEDINAH (MED)",
    namaVendor: "PT AZZA BAROKAH MADINAH",
    totalSeats: 30,
    availableSeats: 30,
    ruteLabel: "CGK - MCT - JED / MED - MCT - CGK",
    tipePenerbangan: "TRANSIT",
    flightItinerary: "*PT AZZA BAROKAH MADINAH*\n*READY PNR 2026/2027 BY OMAN AIR✈️*\n*ABM/MHHXXX MHBXXX/12D/14.500.000*\n1 WY 850G 20FEB J CGKMCT*HK30 1355  1830  /E\n2 WY 673G 20FEB J MCTJED*HK30 2130  0005   21FEB S /E\n3 WY 680G 02MAR T MEDMCT*HK30 1740  2130  /E\n4 WY 849G 03MAR W MCTCGK*HK30 0145  1240  /E",
    updatedAt: new Date().toISOString()
  }
];

async function seedAzzaFlights() {
  const dbId = firebaseConfig.firestoreDatabaseId || 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9';
  console.log(`Connecting via AdminDatabaseResolver to database: ${dbId}`);
  const db = AdminDatabaseResolver.getDatabase(dbId);

  console.log(`Seeding ${azzaFeb2027Flights.length} PT AZZA BAROKAH MADINAH flights into Firestore maskapai collection...`);
  for (const item of azzaFeb2027Flights) {
    const docRef = db.collection('maskapai').doc(item.id);
    await docRef.set(item, { merge: true });
    console.log(`Synchronized to Firestore: ${item.id} - ${item.name}`);
  }
  console.log('All 4 PT AZZA BAROKAH MADINAH flights seeded successfully into Firestore!');
  process.exit(0);
}

seedAzzaFlights().catch(err => {
  console.error('Failed to seed:', err);
  process.exit(1);
});
