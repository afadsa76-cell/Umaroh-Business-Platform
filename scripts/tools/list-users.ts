import { getAdminApp, getAdminDb } from '../../src/services/backendIdentityService';
import { getAuth } from 'firebase-admin/auth';

async function main() {
  const app = getAdminApp();
  const db = getAdminDb();
  const auth = getAuth(app);

  console.log('--- Auth Users ---');
  try {
    const listUsersResult = await auth.listUsers(1000);
    console.log(`Total Auth Users: ${listUsersResult.users.length}`);
    listUsersResult.users.forEach(u => {
      console.log(`- UID: ${u.uid}, Email: ${u.email}`);
    });
  } catch (err: unknown) {
    console.error('Error listing Auth users:', err);
  }

  console.log('\n--- Firestore Users ---');
  try {
    const snap = await db.collection('users').get();
    console.log(`Total Firestore Users: ${snap.size}`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`- DocID (UID): ${doc.id}, Email: ${data.email}, Role: ${data.role}, Status: ${data.status}`);
    });
  } catch (err: unknown) {
    console.error('Error listing Firestore users:', err);
  }
}

main();
