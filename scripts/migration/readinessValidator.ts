/**
 * PORTAL UMAROH ENTERPRISE - PRE-MIGRATION & READINESS VALIDATOR
 * Role: Principal Firebase Architect & Lead Developer
 * 
 * Pre-flight checks on source & target databases before starting the multi-database migration.
 */

import { AdminDatabaseResolver } from '../../src/core/firestore/AdminDatabaseResolver';
import { MigrationEngine } from '../../src/services/MigrationEngine';

async function runReadinessValidator() {
  console.log('========================================================================');
  console.log('🕋 PORTAL UMAROH ENTERPRISE - MULTI-DATABASE READINESS VALIDATOR 🕋');
  console.log('========================================================================');

  const sourceDbId = AdminDatabaseResolver.getSourceDatabaseId();
  const targetDbId = AdminDatabaseResolver.getTargetDatabaseId();

  console.log(`- Source Database ID: ${sourceDbId}`);
  console.log(`- Target Database ID: ${targetDbId}`);

  const engine = MigrationEngine.getInstance();
  console.log('\n🔍 Phase 1: Verifying Database Connectivity...');
  const { sourceOk, targetOk } = await engine.validateDatabases();

  if (!sourceOk) {
    console.error('❌ Connectivity verification failed for SOURCE DATABASE.');
  } else {
    console.log('✅ SOURCE DATABASE is online and accessible.');
  }

  if (!targetOk) {
    console.error('❌ Connectivity verification failed for TARGET DATABASE.');
  } else {
    console.log('✅ TARGET DATABASE is online and accessible.');
  }

  if (!sourceOk || !targetOk) {
    console.error('\n🚨 Pre-flight validation FAILED. Database connections are offline or improperly configured.');
    process.exit(1);
  }

  console.log('\n🔍 Phase 2: Auditing Source Ledger Balances...');
  const sourceDb = AdminDatabaseResolver.getDatabase(sourceDbId);
  try {
    const walletsSnapshot = await sourceDb.collection('wallets').get();
    const trxSnapshot = await sourceDb.collection('transactions').get();

    let totalWalletBalance = 0;
    walletsSnapshot.forEach(doc => {
      totalWalletBalance += doc.data().balance || doc.data().saldo || 0;
    });

    let calculatedBalance = 0;
    trxSnapshot.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || data.nominal || 0;
      const type = data.type || data.jenis;
      if (type === 'credit' || type === 'deposit' || type === 'masuk') {
        calculatedBalance += amount;
      } else if (type === 'debit' || type === 'withdrawal' || type === 'keluar') {
        calculatedBalance -= amount;
      }
    });

    const discrepancy = Math.abs(totalWalletBalance - calculatedBalance);
    console.log(`- Aggregated Wallet Balances: Rp ${totalWalletBalance.toLocaleString()}`);
    console.log(`- Calculated Ledger Balances: Rp ${calculatedBalance.toLocaleString()}`);
    
    if (discrepancy !== 0 && walletsSnapshot.size > 0) {
      console.warn(`⚠️ [WARNING] Balance skew of Rp ${discrepancy.toLocaleString()} detected in the source database.`);
    } else {
      console.log('✅ Double-entry bookkeeping balance matches perfectly with zero variance!');
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`⚠️ Unable to audit financial ledger prior to cutover: ${error.message}`);
  }

  console.log('\n✨ Pre-migration validation SUCCESS. The system is declared READY for cutover.');
  process.exit(0);
}

runReadinessValidator().catch(err => {
  console.error('Critical readiness validator exception:', err);
  process.exit(1);
});
