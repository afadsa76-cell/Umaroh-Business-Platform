import { AdminDatabaseResolver } from './src/core/firestore/AdminDatabaseResolver';

const sourceDbId = 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393';
const targetDbId = 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';

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
  console.log('🕋 PORTAL UMAROH - ADMIN-SDK PRIVILEGED DIRECT DATABASE COPY 🕋');
  console.log('========================================================================');
  console.log(`Source Database : ${sourceDbId}`);
  console.log(`Target Database : ${targetDbId}`);
  console.log('========================================================================');

  console.log('🔄 Resolving database connections...');
  const sourceDb = AdminDatabaseResolver.getDatabase(sourceDbId);
  const targetDb = AdminDatabaseResolver.getDatabase(targetDbId);

  let totalCopied = 0;
  const reports: { collection: string; count: number; status: string }[] = [];

  for (const colName of COLLECTIONS_TO_MIGRATE) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`📂 Migrating collection: [${colName}]`);
    console.log(`-------------------------------------------------------------`);

    try {
      const sourceColRef = sourceDb.collection(colName);
      const querySnapshot = await sourceColRef.get();
      const docCount = querySnapshot.size;

      console.log(`Found ${docCount} documents in source collection [${colName}].`);

      if (docCount === 0) {
        reports.push({ collection: colName, count: 0, status: 'SKIPPED_EMPTY' });
        continue;
      }

      let count = 0;
      let batch = targetDb.batch();
      let batchCount = 0;

      for (const docSnap of querySnapshot.docs) {
        const docId = docSnap.id;
        const docData = docSnap.data();

        // Write to target database batch
        const targetDocRef = targetDb.collection(colName).doc(docId);
        batch.set(targetDocRef, docData, { merge: true });

        count++;
        batchCount++;
        totalCopied++;

        if (batchCount >= 500) {
          console.log(` -> Committing batch of ${batchCount} documents for [${colName}]...`);
          await batch.commit();
          batch = targetDb.batch();
          batchCount = 0;
        }

        if (count % 50 === 0 || count === docCount) {
          console.log(` -> Progress: ${count}/${docCount} documents processed...`);
        }
      }

      if (batchCount > 0) {
        console.log(` -> Committing remaining ${batchCount} documents for [${colName}]...`);
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
  console.log('📊 ADMIN-SDK DIRECT COPY SUMMARY REPORT:');
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
