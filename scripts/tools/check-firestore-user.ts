import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393');

async function checkUserInFirestore(email: string) {
  console.log(`\nChecking Firestore for: ${email}`);
  const q1 = query(collection(db, 'users'), where('email', '==', email));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) {
    snap1.forEach(doc => {
      console.log(`[users] ID: ${doc.id}, Data:`, doc.data());
    });
  } else {
    console.log(`[users] Not found.`);
  }

  const q2 = query(collection(db, 'pre_users'), where('email', '==', email));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) {
    snap2.forEach(doc => {
      console.log(`[pre_users] ID: ${doc.id}, Data:`, doc.data());
    });
  } else {
    console.log(`[pre_users] Not found.`);
  }
}

async function main() {
  await checkUserInFirestore('umrahbisa76@gmail.com');
  await checkUserInFirestore('alfathumrohtravel@gmail.com');
  await checkUserInFirestore('ferian.syah1806@gmail.com');
}

main().catch(console.error);
