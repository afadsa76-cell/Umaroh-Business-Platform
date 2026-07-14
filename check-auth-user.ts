/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testEmail(email: string, pass: string) {
  console.log(`\nTesting sign-in for: ${email} with password: "${pass}"`);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    console.log(`[+] SUCCESSFUL login! UID: ${cred.user.uid}`);
  } catch (err: any) {
    console.log(`[-] FAILED login. Code: ${err.code}, Message: ${err.message}`);
  }
}

async function main() {
  await testEmail('umrahbisa76@gmail.com', 'umaroh123');
  await testEmail('alfathumrohtravel@gmail.com', 'umaroh123');
  await testEmail('ferian.syah1806@gmail.com', 'umaroh123');
}

main().catch(console.error);
