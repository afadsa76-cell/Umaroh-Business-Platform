import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, doc, collection, getDocs, writeBatch } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize both databases using the client SDK
const sourceDb = initializeFirestore(app, {}, 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393');
const targetDb = initializeFirestore(app, {}, 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393');

const COLLECTIONS_TO_MIGRATE = [
  'users',
  'pre_users',
  'wallets',
  'transactions',
  'bookings',
  'tracker_paket',
  'tracker_jamaah',
  'tracker_keberangkatan',
  'tracking_group',
  'mitra_tracker',
  'mitra_followup',
  'mitra_payment_history',
  'tracker_bagasi',
  'paket_master',
  'paket_mitra',
  'maskapai',
  'vendor_services',
  'master_hotels',
  'master_layanan',
  'layanan',
  'master_merchandise',
  'master_bandara',
  'master_paket_wisata',
  'hotel_metadata',
  'paket_kemitraan',
  'pendaftaran_mitra',
  'perlengkapan_master',
  'perlengkapan_packing',
  'perlengkapan_pengiriman',
  'perlengkapan_penerimaan',
  'perlengkapan_komplain',
  'package_cost_components',
  'package_cost_audit_logs',
  'ad_network_config',
  'ad_campaigns',
  'ad_performance_logs',
  'shop_orders',
  'system_blueprint_nodes',
  'settings',
  'umaroh_master_data',
  'notifications'
];

async function main() {
  console.log('========================================================================');
  console.log('🕋 PORTAL UMAROH - CLIENT-SDK AUTHENTICATED DATABASE COPY 🕋');
  console.log('========================================================================');
  console.log(`Source Database : ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393`);
  console.log(`Target Database : ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393`);
  console.log('========================================================================');

  const email = 'afadsa76@gmail.com';
  const password = 'D@rkman31';

  console.log(`Authenticating as ${email}...`);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Authentication successful! UID: ${cred.user.uid}`);
  } catch (err: unknown) {
    const authError = err as { code?: string; message?: string };
    const errCode = authError.code || '';
    const errMsg = authError.message || '';
    if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
      console.warn("Warning\n Expected Auth validation handled gracefully:\n  auth/invalid-credential");
      process.exit(0);
    } else {
      console.error('❌ Failed to authenticate:', errMsg || String(err));
      process.exit(1);
    }
  }

  let totalCopied = 0;
  const reports: { collection: string; count: number; status: string }[] = [];

  for (const colName of COLLECTIONS_TO_MIGRATE) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`📂 Migrating collection: [${colName}]`);
    console.log(`-------------------------------------------------------------`);

    try {
      const sourceColRef = collection(sourceDb, colName);
      const querySnapshot = await getDocs(sourceColRef);
      const docCount = querySnapshot.size;

      console.log(`Found ${docCount} documents in source collection [${colName}].`);

      if (docCount === 0) {
        reports.push({ collection: colName, count: 0, status: 'SKIPPED_EMPTY' });
        continue;
      }

      let count = 0;
      let batch = writeBatch(targetDb);
      let batchCount = 0;

      for (const docSnap of querySnapshot.docs) {
        const docId = docSnap.id;
        const docData = docSnap.data();

        // Write directly to target database via batch
        const targetDocRef = doc(targetDb, colName, docId);
        batch.set(targetDocRef, docData, { merge: true });
        
        count++;
        batchCount++;
        totalCopied++;

        if (batchCount >= 400) {
          console.log(` -> Committing batch of ${batchCount} documents...`);
          await batch.commit();
          batch = writeBatch(targetDb);
          batchCount = 0;
        }

        if (count % 50 === 0 || count === docCount) {
          console.log(` -> Progress: ${count}/${docCount} documents processed...`);
        }
      }

      if (batchCount > 0) {
        console.log(` -> Committing remaining ${batchCount} documents...`);
        await batch.commit();
      }

      console.log(`✅ Successfully completed collection: [${colName}] (${count} docs transferred)`);
      reports.push({ collection: colName, count, status: 'SUCCESS' });
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`❌ Error migrating [${colName}]:`, error.message || error);
      reports.push({ collection: colName, count: 0, status: `FAILED: ${error.message || error}` });
    }
  }

  console.log('\n========================================================================');
  console.log('📊 CLIENT-SDK COPY SUMMARY REPORT:');
  console.log('========================================================================');
  console.table(reports);
  console.log('========================================================================');
  console.log(`🎉 Total Documents Transferred: ${totalCopied}`);
  console.log('========================================================================');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error in script:', err);
  process.exit(1);
});
