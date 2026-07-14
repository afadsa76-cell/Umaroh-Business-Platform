/**
 * PORTAL UMAROH ENTERPRISE - FIRESTORE DATA INTEGRITY VALIDATOR
 * Role: Principal Firebase Architect & Lead Developer
 * 
 * Verifies document parity, structural integrity, and financial balancing in the target database.
 */

import { MigrationEngine } from '../../src/services/MigrationEngine';

async function runFirestoreValidation() {
  console.log('========================================================================');
  console.log('🕋 PORTAL UMAROH ENTERPRISE - FIRESTORE DATA INTEGRITY VALIDATOR 🕋');
  console.log('========================================================================');

  const engine = MigrationEngine.getInstance();
  console.log('🔍 Executing Live Post-Migration Integrity Audit...');
  const success = await engine.verifyIntegrity();

  const state = engine.getState();
  if (success) {
    console.log('✅ Integrity Audit PASSED. All documents and transactions are consistent.');
    process.exit(0);
  } else {
    console.error('❌ Integrity Audit FAILED or flagged warnings.');
    state.warnings.forEach(w => console.warn(`- ${w}`));
    process.exit(1);
  }
}

runFirestoreValidation().catch(err => {
  console.error('Critical integrity validator exception:', err);
  process.exit(1);
});
