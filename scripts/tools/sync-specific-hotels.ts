import { db } from "../../src/firebase";
import { doc, setDoc } from "firebase/firestore";

const arkanAlManar = {
  id: "arkan-al-manar-alharmain",
  name: "Arkan Al Manar",
  city: "Madinah",
  vendor: "Alharmain Hotels Management",
  mealPlan: "RO",
  stars: 4,
  seasons: [
    {
      range: "30/06/2026 TO 20/09/2026",
      prices: [
        { roomType: "Double", price: 480 },
        { roomType: "Triple", price: 540 },
        { roomType: "Quad", price: 600 }
      ]
    }
  ]
};

const snoodAjyad = {
  id: "snood-ajyad-alharmain",
  name: "Snood Ajyad",
  city: "Makkah",
  vendor: "Alharmain Hotels Management",
  mealPlan: "RO",
  stars: 3,
  seasons: [
    {
      range: "15/06/2026 TO 01/07/2026",
      prices: [
        { roomType: "Double", price: 430 },
        { roomType: "Triple", price: 480 },
        { roomType: "Quad", price: 530 }
      ]
    },
    {
      range: "01/07/2026 TO 01/08/2026",
      prices: [
        { roomType: "Double", price: 500 },
        { roomType: "Triple", price: 550 },
        { roomType: "Quad", price: 600 }
      ]
    }
  ]
};

async function main() {
  console.log("Synchronizing specific referenced hotels...");
  
  await setDoc(doc(db, "master_hotels", arkanAlManar.id), {
    ...arkanAlManar,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("Synchronized arkan-al-manar-alharmain");

  await setDoc(doc(db, "master_hotels", snoodAjyad.id), {
    ...snoodAjyad,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("Synchronized snood-ajyad-alharmain");

  console.log("Successfully completed targeted hotel synchronization!");
  process.exit(0);
}

main().catch(console.error);
