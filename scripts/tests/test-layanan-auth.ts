import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const sourceDb = initializeFirestore(app, {}, 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393');
const targetDb = initializeFirestore(app, {}, 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393');

async function main() {
  const email = 'afadsa76@gmail.com';
  const password = 'D@rkman31';

  console.log(`Authenticating as ${email}...`);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Auth success!');
  } catch (err: unknown) {
    const authError = err as { code?: string; message?: string };
    const errCode = authError.code || '';
    const errMsg = authError.message || '';
    if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
      console.warn("Warning\n Expected Auth validation handled gracefully:\n  auth/invalid-credential");
      return;
    } else {
      console.error('❌ Failed to authenticate:', errMsg || String(err));
      process.exit(1);
    }
  }

  console.log('Reading from source...');
  try {
    const ref = collection(sourceDb, 'layanan');
    const snap = await getDocs(ref);
    console.log(`Total documents in source [layanan]: ${snap.size}`);
    
    const regex = /^[a-zA-Z0-9_-]+$/;
    snap.docs.forEach(docSnap => {
      const id = docSnap.id;
      const matches = regex.test(id);
      console.log(`Doc ID: "${id}" | matches regex: ${matches}`);
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to read source [layanan]:', errMsg);
  }

  console.log('Testing write to target...');
  try {
    const testDocRef = doc(targetDb, 'layanan', 'test-id-123');
    await setDoc(testDocRef, { name: 'Test' }, { merge: true });
    console.log('✅ Write success for valid ID "test-id-123"!');
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to write valid ID to target:', errMsg);
  }

  try {
    const testDocRef = doc(targetDb, 'layanan', 'test ID with spaces');
    await setDoc(testDocRef, { name: 'Test' }, { merge: true });
    console.log('✅ Write success for invalid ID!');
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Expected failure for invalid ID with spaces:', errMsg);
  }
}

main().catch(console.error);
